import express from "express";
import cors from "cors"
import dotenv from "dotenv"
import TokenService from "../../services/data/tokenService.js";
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



app.post('/checkToken',cors(corsOptions),(req,res)=>{
    TokenService().checkToken(req,res)
})


app.post('/authNumCheck',cors(corsOptions),(req,res)=>{
    TokenService().authNumCheck(req,res)
})




export default app