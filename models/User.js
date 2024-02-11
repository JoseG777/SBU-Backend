const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  prescription_info: { type: String, required: false },
  doctor_notes: { type: String, required: false }

  // email: { type: String, required: true, unique: true },
});

//before saving to the database, we are hashing the password to ensure security
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 8);
});

//compare the password entered by the user with the hashed password in the database when logging in
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getMedicals = async function () {
  return {prescription : this.prescription_info, notes:this.doctor_notes};
};

const User = mongoose.model('User', userSchema);

module.exports = User;