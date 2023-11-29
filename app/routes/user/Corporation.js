import CompanyService from "../../services/user/corporation/CorporationService.js";
import express from "express";
import cors from "cors"
import dotenv from "dotenv"
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

app.post('/find',cors(corsOptions),(req,res)=>{
    CompanyService().findService(req,res)
})
app.post('/approval',cors(corsOptions),(req,res)=>{
    CompanyService().approvalCompany(req,res)
})
app.post('/login',cors(corsOptions),(req,res)=>{
    CompanyService().companyLogin(req,res)
})
app.get('/logout',cors(corsOptions),(req,res)=>{
    CompanyService().logout(req,res)
})


export default app