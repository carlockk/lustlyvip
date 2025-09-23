import dbConnect from '../../../../lib/dbConnect';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  await dbConnect();
  try {
    let username, email, password, role;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      ({ username, email, password, role } = body || {});
    } else if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      username = form.get('username');
      email = form.get('email');
      password = form.get('password');
      role = form.get('role');
    } else {
      const body = await request.json();
      ({ username, email, password, role } = body || {});
    }
    role = (role === 'creator' || role === 'consumer') ? role : 'consumer';

    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ success: false, message: 'User with this email already exists' }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword, role });
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    if (error.name === 'ValidationError') {
      let errors = {}; Object.keys(error.errors).forEach((key) => { errors[key] = error.errors[key].message; });
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
