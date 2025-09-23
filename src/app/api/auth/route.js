import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';

const authOptions = {
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
            // Compara la contraseña encriptada
            const isMatch = await bcrypt.compare(credentials.password, user.password);

            if (isMatch) {
              return {
                id: user._id,
                name: user.username,
                email: user.email,
              };
            }
          }

          // Si el usuario no existe o la contraseña es incorrecta
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
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };