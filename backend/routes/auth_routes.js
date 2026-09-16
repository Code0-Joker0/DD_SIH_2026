import {Router} from "express";
import * as authController from "../controllers/auth_controller.js"
import { protect } from "../middleware/middle.js";

const authRouter = Router();

// when post request comes here following functions present in the auth controller are triggered
//authRouter.post("/register", authController.connectionPostAgain)
authRouter.post("/register", authController.register);
authRouter.get("/get-me", authController.getMe, protect);
authRouter.post("/login", authController.login);
authRouter.post("/logout", authController.logout);
//authRouter.get("/data", getAllUsers);

export default authRouter;
