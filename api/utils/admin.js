// Who is an administrator. There is no way to become one from inside the site: the owner
// lists account email addresses in the ADMIN_EMAILS setting (comma separated).
import { isMailConfigured } from './mailer.js';

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

export const isAdminUser = (user) => {
  if (!user?.email || user.suspendedAt) return false;
  // Compared exactly, capitals included. The site treats addresses that differ only in
  // capitals as different accounts, so a looser match would let somebody register a
  // look-alike of an administrator's address.
  if (!adminEmails().includes(user.email)) return false;
  // Where the site can send email, the address must also be confirmed, so listing an address
  // that has no account yet cannot hand the role to whoever registers it first.
  return user.emailVerified === true || !isMailConfigured();
};
