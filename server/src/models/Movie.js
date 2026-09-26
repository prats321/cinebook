import mongoose from 'mongoose';

const castSchema = new mongoose.Schema(
  { name: String, character: String, profileUrl: String },
  { _id: false },
);

const movieSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, unique: true, sparse: true },
    title: { type: String, required: true, trim: true },
    overview: String,
    posterUrl: String,
    backdropUrl: String,
    releaseDate: Date,
    runtime: { type: Number, default: 150 }, // minutes
    genres: [String],
    language: String,
    rating: { type: Number, default: 0 },
    trailerKey: String, // YouTube video id
    cast: [castSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

movieSchema.index({ isActive: 1, releaseDate: -1 });

export const Movie = mongoose.model('Movie', movieSchema);
