import bcrypt from 'bcrypt';
import User from '../models/user.model.js';
import createError from '../utils/createError.js';
import { TOKEN_MAX_AGE_MS, cookieOptions, signAccessToken } from '../utils/token.js';

// Hash of a random throwaway value. Compared against when the username does not exist, so
// that case takes as long as a wrong password and cannot be told apart by timing.
const DUMMY_HASH = '$2b$12$1eaGLsSAP4cg0YDRoZGyPeJMz6a1UzdCWyoUHxXSS32m7UpGVXwD6';

const sendSession = (res, user, status) => {
  // eslint-disable-next-line no-unused-vars
  const { password, ...info } = user._doc;
  res
    .cookie('accessToken', signAccessToken(user), { ...cookieOptions, maxAge: TOKEN_MAX_AGE_MS })
    .status(status)
    .send(info);
};

export const register = async (req, res, next) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 12);
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hash,
      img: req.body.img,
      phone: req.body.phone,
      location: req.body.location,
      desc: req.body.desc,
      isSeller: req.body.isSeller,
    });
    await newUser.save();

    // Automatically log in the user after registration
    sendSession(res, newUser, 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.body.username });

    // Same response whether the username or the password is wrong.
    const isCorrect = await bcrypt.compare(req.body.password, user ? user.password : DUMMY_HASH);
    if (!user || !isCorrect) return next(createError(400, 'Wrong username or password!'));

    sendSession(res, user, 200);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res) => {
  res.clearCookie('accessToken', cookieOptions).status(200).send('Logged out');
};
