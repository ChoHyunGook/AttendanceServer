import express from "express";
import cors from "cors"
import dotenv from "dotenv"
import SendService from "../../services/send/sendService.js";
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


app.post('/smsRegister',cors(corsOptions),(req,res)=>{
    SendService().RegisterSMS(req,res)
})

app.post('/smsCompany',cors(corsOptions),(req,res)=>{
    SendService().companyApproval(req,res)
})




export default app