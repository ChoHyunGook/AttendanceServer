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

app.post('/get/data',cors(corsOptions),(req,res)=>{
    AdminService().getData(req,res)
})
app.post('/find/data',cors(corsOptions),(req,res)=>{
    AdminService().findData(req,res)
})
app.post('/companyInfoUpdate',cors(corsOptions),(req,res)=>{
    AdminService().companyInfoUpdate(req,res)
})



export default app