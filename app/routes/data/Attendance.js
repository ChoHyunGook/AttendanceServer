import express from "express";
import cors from "cors"
import dotenv from "dotenv"
import AttendanceService from "../../services/data/attendanceService.js";
dotenv.config()


const corsOptions = {
    origin : process.env.ORIGIN,
    optionsSuccessStatus : 200
}

const app = express()

app.use(cors({
    origin:true,
    credentials: true
}))


app.use(function(_req, res, next) {
    res.header(
        "Access-Control-Allow-Tabletheaders",
        "x-access-token, Origin, Content-Type, Accept",
        "Access-Control-Allow-Origin", "*"
    );
    next();
});


app.post('/refine/processing/getData',cors(corsOptions),(req,res)=>{
    AttendanceService().refineAndGetData(req,res)
})

app.get('/getHoliday',cors(corsOptions),(req,res)=>{
    AttendanceService().getHoliday(req,res)
})

app.post('/vacation/service',cors(corsOptions),(req,res)=>{
    AttendanceService().vacationService(req,res)
})




export default app



