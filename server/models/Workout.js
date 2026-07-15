import mongoose from 'mongoose';

const setSchema = new mongoose.Schema({
  weight: { type: Number, required: true },
  reps: { type: Number, required: true },
}, { _id: false });

const exerciseEntrySchema = new mongoose.Schema({
  exercise: { type: String, required: true },
  bodyPart: { type: String, required: true },
  sets: [setSchema],
}, { _id: false });

const workoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
    index: true,
  },
  exercises: [exerciseEntrySchema],
}, { timestamps: true });

// Compound index: one workout doc per user per date
workoutSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('Workout', workoutSchema);
