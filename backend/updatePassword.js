require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function updatePassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'supplier@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    user.password = '12345678';
    await user.save();
    console.log('Password updated successfully');
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    mongoose.connection.close();
  }
}

updatePassword();
