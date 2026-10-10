import jwt from 'jsonwebtoken';
import { store } from '../models/store.js';

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'super_secret_jwt_key_broker_app_2026', {
    expiresIn: '30d',
  });
};

export const registerUser = async (req, res) => {
  try {
    const { name, company, email, password, role, initialPlan } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingUser = store.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const newUser = store.createUser({
      name,
      company: company || 'Independent Broker',
      email,
      password,
      role: role || 'broker',
      initialPlan: initialPlan || 'none',
    });

    const token = generateToken(newUser.id, newUser.role);

    store.logAction({
      action: 'USER_REGISTERED',
      statusCode: 200,
      errorCode: 'NONE',
      message: `New ${newUser.role} user '${newUser.name}' (${newUser.email}) registered successfully.`,
    });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          company: newUser.company,
          email: newUser.email,
          role: newUser.role,
          brokerState: newUser.brokerState,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = store.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = store.verifyPassword(user, password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.role);

    store.logAction({
      action: 'USER_LOGGED_IN',
      statusCode: 200,
      errorCode: 'NONE',
      message: `User '${user.name}' (${user.email}) logged in.`,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          company: user.company,
          email: user.email,
          role: user.role,
          brokerState: user.brokerState,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCurrentUserProfile = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          company: user.company,
          email: user.email,
          role: user.role,
          brokerState: user.brokerState,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
