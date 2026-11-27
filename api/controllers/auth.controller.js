import bcrypt from 'bcrypt';
import User, { ownProfile } from '../models/user.model.js';
import createError from '../utils/createError.js';
import { clientUrl, trySendMail } from '../utils/mailer.js';
import { createToken, hashToken } from '../utils/oneTimeToken.js';
import { TOKEN_MAX_AGE_MS, cookieOptions, signAccessToken } from '../utils/token.js';

const VERIFY_LIFETIME_MS = 24 * 60 * 60 * 1000;
const RESET_LIFETIME_MS = 60 * 60 * 1000;

// Hash of a random throwaway value. Compared against when the username does not exist, so
// that case takes as long as a wrong password and cannot be told apart by timing.
const DUMMY_HASH = '$2b$12$1eaGLsSAP4cg0YDRoZGyPeJMz6a1UzdCWyoUHxXSS32m7UpGVXwD6';

const sendSession = (res, user, status) => {
  res
    .cookie('accessToken', signAccessToken(user), { ...cookieOptions, maxAge: TOKEN_MAX_AGE_MS })
    .status(status)
    .send(ownProfile(user));
};

const sendVerificationEmail = async (user) => {
  const { token, hash, expires } = createToken(VERIFY_LIFETIME_MS);
  user.emailVerifyTokenHash = hash;
  user.emailVerifyExpires = expires;
  await user.save();
  return trySendMail({
    to: user.email,
    subject: 'Confirm your email for Taste of Home',
    text: [
      `Hi ${user.username},`,
      '',
      'Please confirm your email address by opening this link:',
      clientUrl(`/verify-email?token=${token}`),
      '',
      'The link works for 24 hours. If you did not create this account, you can ignore this email.',
    ].join('\n'),
  });
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
    await sendVerificationEmail(newUser);

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

export const verifyEmail = async (req, res, next) => {
  try {
    const user = await User.findOne({
      emailVerifyTokenHash: hashToken(req.body.token),
      emailVerifyExpires: { $gt: new Date() },
    });
    if (!user) return next(createError(400, 'This link is not valid or has expired.'));

    user.emailVerified = true;
    user.emailVerifyTokenHash = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();
    res.status(200).send({ message: 'Your email address is confirmed.' });
  } catch (err) {
    next(err);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return next(createError(404, 'User not found!'));
    if (user.emailVerified) {
      return res.status(200).send({ message: 'Your email address is already confirmed.' });
    }
    const sent = await sendVerificationEmail(user);
    if (!sent) return next(createError(503, 'Email is not set up on this site yet.'));
    res.status(200).send({ message: `We sent a confirmation link to ${user.email}.` });
  } catch (err) {
    next(err);
  }
};

// Always answers the same way, so it cannot be used to find out who has an account.
export const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const { token, hash, expires } = createToken(RESET_LIFETIME_MS);
      user.resetTokenHash = hash;
      user.resetExpires = expires;
      await user.save();
      await trySendMail({
        to: user.email,
        subject: 'Reset your Taste of Home password',
        text: [
          `Hi ${user.username},`,
          '',
          'Open this link to choose a new password:',
          clientUrl(`/reset-password?token=${token}`),
          '',
          'The link works for one hour and only once. If you did not ask for it, you can ignore',
          'this email and your password stays as it is.',
        ].join('\n'),
      });
    }
    res.status(200).send({
      message: 'If an account uses that email, we have sent a link to reset the password.',
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({
      resetTokenHash: hashToken(req.body.token),
      resetExpires: { $gt: new Date() },
    });
    if (!user) return next(createError(400, 'This link is not valid or has expired.'));

    user.password = await bcrypt.hash(req.body.password, 12);
    user.resetTokenHash = undefined;
    user.resetExpires = undefined;
    // Using the link also proves the mailbox belongs to this user.
    user.emailVerified = true;
    await user.save();
    res.status(200).send({ message: 'Your password has been changed. You can log in now.' });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return next(createError(404, 'User not found!'));

    const isCorrect = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!isCorrect) return next(createError(400, 'Your current password is not correct.'));

    user.password = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();
    res.status(200).send({ message: 'Your password has been changed.' });
  } catch (err) {
    next(err);
  }
};
