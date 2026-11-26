import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    img: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    location: {
      type: String,
      required: false,
    },
    desc: {
      type: String,
      required: false,
    },
    isSeller: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    // Hashes of the one-time tokens sent by email (see utils/oneTimeToken.js).
    emailVerifyTokenHash: String,
    emailVerifyExpires: Date,
    resetTokenHash: String,
    resetExpires: Date,
    // Ids of the items this user saved.
    favourites: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// What a user may see about their own account. Everything else (password hash, token
// hashes) stays on the server.
const OWN_FIELDS = [
  '_id',
  'username',
  'email',
  'img',
  'phone',
  'location',
  'desc',
  'isSeller',
  'emailVerified',
  'favourites',
  'createdAt',
];
export const ownProfile = (user) => Object.fromEntries(OWN_FIELDS.map((key) => [key, user[key]]));

export default mongoose.model('User', userSchema);
