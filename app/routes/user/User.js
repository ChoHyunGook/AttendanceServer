import express from "express";
import cors from "cors"
import dotenv from "dotenv"
import UserService from "../../services/user/userService.js";
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



app.post('/register', cors(corsOptions), (req,res)=>{
    UserService().register(req,res)
})

app.post('/login',cors(corsOptions),(req,res)=>{
    UserService().login(req,res)
})

app.get('/logout',cors(corsOptions),(req,res)=>{
    UserService().logout(req,res)
})
app.post('/findService',cors(corsOptions),(req,res)=>{
    UserService().find(req,res)
})
app.post('/addInfo',cors(corsOptions),(req,res)=>{
    UserService().addInfo(req,res)
})
app.post('/addLoginTimes',cors(corsOptions),(req,res)=>{
    UserService().addLoginTime(req,res)
})



export default app


