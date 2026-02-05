import User from "../../models/user.js";
import Wallet from "../../models/wallet.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateCode, sendVerificationCode } from "../../services/smsService.js";
import db from "../../config/knex.js";

// Normalize Iraqi mobile phone numbers to +9647XXXXXXXX format
function normalizeIraqPhone(input) {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, ""); // keep digits only
  // Remove common international prefixes
  if (digits.startsWith("00964")) digits = digits.slice(5);
  else if (digits.startsWith("964")) digits = digits.slice(3);
  // Remove leading 0 for local format like 07XXXXXXXX
  if (digits.startsWith("07")) digits = digits.slice(1);
  // At this point we expect 10 digits starting with 7
  if (!/^7\d{9}$/.test(digits)) {
    // If it doesn't match, return original plus-only format best-effort
    // but prefer rejecting by returning null so caller can decide
    return null;
  }
  return `+964${digits}`;
}

// Register a new user (SQL/Knex)
const register = async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, phone, channel, lang, fallback } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required." });
    }

    // Check if user already exists
    const existingUser =
      (await User.findByUsername(username)) || (await User.findByEmail(email));
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or email already in use." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (store as password)
    const normalizedPhone = phone ? normalizeIraqPhone(phone) : null;
    if (phone && !normalizedPhone) {
      return res.status(400).json({ message: "Invalid phone format. Use 7XXXXXXXXX or 07XXXXXXXX, saved as +9647XXXXXXXX." });
    }
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      first_name: first_name || null,
      last_name: last_name || null,
      phone: normalizedPhone || null,
    });

    // Create wallet for the user immediately after registration
    try {
      await Wallet.createIfMissing(user.id, 'IQD');
      console.log(`Wallet created for user ${user.id} during registration`);
    } catch (walletErr) {
      console.error(`Failed to create wallet for user ${user.id}:`, walletErr.message);
      // Don't fail registration if wallet creation fails
    }

    let otpSent = false;
    // If phone provided, generate and send verification code
    if (normalizedPhone) {
      try {
        const code = generateCode(6);
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await User.update(user.id, {
          phone_verified: false,
          phone_verification_code: code,
          phone_verification_expires: expires,
        });
        await sendVerificationCode(normalizedPhone, code, 'Phone verification', { channel, lang, fallback });
        otpSent = true;
      } catch (e) {
        // Don't fail registration if SMS sending fails
        console.warn('Failed to send verification code during register:', e.message);
      }
    }

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        status: user.status,
        phone_verified: user.phone_verified ?? false
      },
      otpSent,
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error.", error: err.message
    });
  }
};

// Login user (SQL/Knex)
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    // Find user
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Check if user is superadmin (for admin panel access)
    // Regular users can still login, but admin panel requires superadmin role
    const isSuperAdmin = user.role === 'superadmin';

    // Create wallet if missing (for existing users who might not have one)
    try {
      await Wallet.createIfMissing(user.id, 'IQD');
    } catch (walletErr) {
      console.error(`Failed to create wallet for user ${user.id} during login:`, walletErr.message);
      // Don't fail login if wallet creation fails
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        status: user.status,
        phone_verified: user.phone_verified ?? false,
        role: user.role || 'user',
        isSuperAdmin: user.role === 'superadmin'
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Don't send password hash
    const { password, ...userProfile } = user;

    res.json({ user: userProfile });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { first_name, last_name, phone, email, avatar } = req.body;

    // Find existing user
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingUser.email) {
      const emailExists = await User.findByEmail(email);
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use." });
      }
    }

    // Prepare update data
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) {
      if (phone === null || phone === '') {
        updateData.phone = null;
      } else {
        const normalizedPhone = normalizeIraqPhone(phone);
        if (!normalizedPhone) {
          return res.status(400).json({ message: "Invalid phone format. Use 7XXXXXXXXX or 07XXXXXXXX, saved as +9647XXXXXXXX." });
        }
        updateData.phone = normalizedPhone;
      }
    }
    if (email !== undefined) updateData.email = email;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Update user
    const updatedUser = await User.update(userId, updateData);

    // Don't send password hash
    const { password, ...userProfile } = updatedUser;

    res.json({
      message: "Profile updated successfully.",
      user: userProfile,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long."
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await User.update(userId, { password: hashedPassword });

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

export { register, login, getProfile, updateProfile, changePassword };

// --- Phone Verification & Password Reset Extensions --- //

// Start phone verification (authenticated)
export const startPhoneVerification = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.phone) return res.status(400).json({ message: "Phone number not set." });
    if (user.phone_verified) return res.status(200).json({ message: "Phone already verified." });

    const code = generateCode(6);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await User.update(user.id, {
      phone_verification_code: code,
      phone_verification_expires: expires,
    });
    const { channel, lang, fallback } = req.body || {};
    await sendVerificationCode(user.phone, code, 'Phone verification', { channel, lang, fallback });
    res.json({ message: "Verification code sent." });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// Check phone verification code (authenticated)
export const verifyPhone = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code is required." });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.phone_verified) return res.status(200).json({ message: "Phone already verified." });
    if (!user.phone_verification_code || !user.phone_verification_expires)
      return res.status(400).json({ message: "No active verification code." });
    if (new Date(user.phone_verification_expires) < new Date())
      return res.status(400).json({ message: "Code expired." });
    if (String(code) !== String(user.phone_verification_code))
      return res.status(400).json({ message: "Invalid code." });

    // Update user verification status
    await User.update(user.id, {
      phone_verified: true,
      phone_verification_code: null,
      phone_verification_expires: null,
      status: 'active',
    });

    // Create wallet for the user automatically
    try {
      await Wallet.createIfMissing(userId, 'IQD');
      console.log(`Wallet created for user ${userId} after phone verification`);
    } catch (walletErr) {
      console.error(`Failed to create wallet for user ${userId}:`, walletErr.message);
      // Don't fail the verification if wallet creation fails
    }

    res.json({ message: "Phone verified successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// Request password reset (public)
export const requestPasswordReset = async (req, res) => {
  try {
    const { username, email, phone, channel, lang, fallback } = req.body;
    if (!username && !email && !phone)
      return res.status(400).json({ message: "Provide username, email, or phone." });
    let user = null;
    if (username) user = await User.findByUsername(username);
    if (!user && email) user = await User.findByEmail(email);
    if (!user && phone) {
      const normalizedPhone = normalizeIraqPhone(phone);
      if (normalizedPhone) {
        user = await db('users').where({ phone: normalizedPhone }).first();
      }
    }
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.phone) return res.status(400).json({ message: "User has no phone number; cannot send reset code." });
    const code = generateCode(6);
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await User.update(user.id, {
      password_reset_code: code,
      password_reset_expires: expires,
    });
    await sendVerificationCode(user.phone, code, 'Password reset', { channel, lang, fallback });
    res.json({ message: "If the account exists, a reset code was sent." });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// Reset password with code (public)
export const resetPassword = async (req, res) => {
  try {
    const { username, email, phone, code, newPassword } = req.body;
    if (!code || !newPassword)
      return res.status(400).json({ message: "Code and newPassword are required." });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    let user = null;
    if (username) user = await User.findByUsername(username);
    if (!user && email) user = await User.findByEmail(email);
    if (!user && phone) {
      const normalizedPhone = normalizeIraqPhone(phone);
      if (normalizedPhone) {
        user = await db('users').where({ phone: normalizedPhone }).first();
      }
    }
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.password_reset_code || !user.password_reset_expires)
      return res.status(400).json({ message: "No active reset code." });
    if (new Date(user.password_reset_expires) < new Date())
      return res.status(400).json({ message: "Reset code expired." });
    if (String(code) !== String(user.password_reset_code))
      return res.status(400).json({ message: "Invalid reset code." });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update(user.id, {
      password: hashedPassword,
      password_reset_code: null,
      password_reset_expires: null,
    });
    res.json({ message: "Password reset successful." });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

