import dotenv from "dotenv";
import mongoose from "mongoose";
import UserModel from "./User.js";
import AttendanceModel from "./Attendance.js";
import CompanyInfoModel from './Company.js'




const db = {}
db.mongoose = mongoose
db.url = dotenv.MONGO_URI
db.User=new UserModel(mongoose)
db.Attendance=new AttendanceModel(mongoose)
db.Company=new CompanyInfoModel(mongoose)




export default db
