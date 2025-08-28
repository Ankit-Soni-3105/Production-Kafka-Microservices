import { Router } from "express";
import { userValidationRules } from "../middlewares/user.validations.js";
import { createUserController, followUserController, getallUserController, getUserController, loginUserController, logoutUserController, unfollowUserController, verifyPuzzle, verifyUserByOtpController } from "../controllers/user.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import passport from 'passport';
import '../utils/Authpassport.js';
import jwt from 'jsonwebtoken';
import config from "../config/config.js";



const router = Router();

router.post(
    '/register',
    userValidationRules,
    createUserController
);

router.post(
    '/login',
    loginUserController
);

router.post(
    '/verify-account',
    authenticateUser,
    verifyUserByOtpController
);

router.get(
    '/profile',
    authenticateUser,
    getUserController
);

router.get(
    '/logout',
    authenticateUser,
    logoutUserController
)

router.get(
    '/get-all-users',
    authenticateUser,
    getallUserController
)

// router.get(
//     '/google-auth',
//     passport.authenticate('google', { scope: ['profile', 'email'] })
// )

router.get(
    '/follow',
    authenticateUser,
    followUserController
)

router.get(
    '/unfollow',
    authenticateUser,
    unfollowUserController
)

router.get(
    '/verify-puzzle',
    authenticateUser,
    verifyPuzzle
)

export default router;