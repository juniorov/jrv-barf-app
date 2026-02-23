import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Cargamos variables de entorno para obtener el prefijo de colecciones
dotenv.config();

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Hook de Mongoose que encripta la contraseña antes de guardar el usuario
// Importante: al usar async/await NO debemos recibir ni llamar a "next"
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};
// Nombre de la colección de usuarios con prefijo configurable desde .env (PREFIX)
const prefix = process.env.PREFIX || 'barf';
const userCollectionName = `${prefix}_users`;
const User = mongoose.model('User', userSchema, userCollectionName);

export default User;

