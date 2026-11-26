import mongoose from 'mongoose';
const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    itemId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    star: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5],
    },
    desc: {
      type: String,
      required: true,
    },
    // Ids of the users who found this review helpful, or not.
    helpful: {
      type: [String],
      default: [],
    },
    notHelpful: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.index({ itemId: 1 });
// One review per buyer per item, enforced by the database as well as the controller.
ReviewSchema.index({ itemId: 1, userId: 1 }, { unique: true });

export default mongoose.model('Review', ReviewSchema);
