import express from "express";
import cors from "cors"
import dotenv from "dotenv"
import AdminService from "../../services/admin/adminService.js";
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

app.get('/get/adminService',cors(corsOptions),(req,res)=>{
    AdminService().getData(req,res)
})

app.post('/organizations/service',cors(corsOptions),(req,res)=>{
    AdminService().adminService(req,res)
})

app.post('/find/service',cors(corsOptions),(req,res)=>{
    AdminService().findService(req,res)
})



export default app