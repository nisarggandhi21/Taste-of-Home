import mongoose from 'mongoose';
import { isAdminUser } from '../utils/admin.js';
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
    // Set by an administrator. A suspended account cannot log in or do anything.
    suspendedAt: Date,
    suspendReason: String,
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
export const ownProfile = (user) => ({
  ...Object.fromEntries(OWN_FIELDS.map((key) => [key, user[key]])),
  // Lets the client show the admin pages; every admin request is checked again on the server.
  isAdmin: isAdminUser(user),
});

export default mongoose.model('User', userSchema);
