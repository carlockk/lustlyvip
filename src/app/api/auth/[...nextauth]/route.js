import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                await dbConnect();

                try {
                    const user = await User.findOne({ email: credentials.email });

                    if (user) {
                        const isMatch = await bcrypt.compare(credentials.password, user.password);

                        if (isMatch) {
                            // Ahora se añade la foto de perfil del usuario a la respuesta
                            return {
                                id: user._id,
                                name: user.username,
                                email: user.email,
                                image: user.profilePicture, // <-- AÑADIDO: La URL de la foto de perfil
                            };
                        }
                    }
                    return null;
                } catch (e) {
                    console.error('Login error:', e);
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: '/auth/login',
    },
    secret: process.env.NEXTAUTH_SECRET,

    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                // Al iniciar sesión: sincroniza ID e imagen
                token.id = user.id;
                token.image = user.image;
                token.name = user.name;
            } else if (token?.id) {
                // En actualizaciones de sesión o peticiones normales: refresca imagen/nombre desde DB
                try {
                    await dbConnect();
                    const dbUser = await User.findById(token.id).select('username profilePicture').lean();
                    if (dbUser) {
                        token.image = dbUser.profilePicture || null;
                        token.name = dbUser.username || token.name;
                    }
                } catch {}
            }
            return token;
        },
        async session({ session, token }) {
            // Adjunta ID, imagen y nombre actualizados en cada solicitud
            session.user.id = token.id;
            session.user.image = token.image || null;
            if (token.name) session.user.name = token.name;
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
