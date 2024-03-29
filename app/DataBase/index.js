import dotenv from "dotenv";
import mongoose from "mongoose";
import UserModel from "./User.js";
import VacationModel from "./Vacation.js";
import CompanyInfoModel from './Company.js'
import DeviceModel from './Device.js'
import HolidayModel from './Holiday.js'





const db = {}
db.mongoose = mongoose
db.url = dotenv.MONGO_URI
db.User=new UserModel(mongoose)
db.Vacation=new VacationModel(mongoose)
db.Company=new CompanyInfoModel(mongoose)
db.Device = new DeviceModel(mongoose)
db.Holiday = new HolidayModel(mongoose)



export default db
