import db from "../../../DataBase/index.js";
import bcrypt from "bcrypt";
import moment from "moment-timezone";
import jwt from "jsonwebtoken";
import applyDotenv from "../../../Lambdas/applyDotenv.js";
import dotenv from "dotenv";


export default function CorporationService(){

    const { access_jwt_secret,authNum_jwt_secret,COMPANY_SECRET }=applyDotenv(dotenv)

    const Company = db.Company

    return{
        companyInfo(req,res){
            Company.find({})
                .then(findData=>{
                    res.status(200).send(findData)
                })
        },

        //회사로 조회 => responsibility 맵(아이디,폰,이름 동일) => 데이터 추출 =>
        // responsibility 전체에서 추출데이터 findIndex돌리고 인덱스값 추출 =>
        // 키 이름 responsibility.${인덱스값}.password => obj생성자 만들고 obj[키이름] = 비밀번호 해시화 한 데이터 =>
        // 업데이트에 {$set: obj } 를 넣으면 배열 내 배열내 배열
        findService(req,res){
            const data= req.body
            const params = req.query.select
            if(params === 'Change'){

                Company.find({company:data.company})
                    .then(findData=>{
                        const filter = findData[0].responsibility
                        let selectedData = []
                        filter.map(e=>{
                            if(e.companyId === data.id && e.phone === data.phone && e.name === data.name){
                                selectedData.push(e)
                            }
                        })
                        const index = filter.findIndex(item=>item == selectedData[0])
                        const pw = selectedData[0].password
                        const bcryptPwData = bcrypt.hashSync(data.pw, 10)
                        const update = `responsibility.${index}.password`
                        const obj = {}
                        obj[update] = bcryptPwData

                        Company.findOneAndUpdate({company:data.company},{$set:obj})
                            .then(com=>{
                                res.status(200).send('기업 비밀번호 변경 완료. 로그인 페이지로 이동됩니다.')
                            })
                            .catch(err=>{
                                res.status(400).send(err)
                            })

                    })

            }else{
                Company.find({})
                    .then(allData=>{
                        let findData =[]
                        allData.map(all=>{
                            all.responsibility.map(item=>{
                                if(params === 'Id'){
                                    if(data.name === item.name){
                                        if(data.phone === item.phone){
                                            let pushData = {
                                                company:all.company,
                                                id:item.companyId,
                                                name:data.name
                                            }
                                            findData.push(pushData)
                                        }
                                    }
                                }
                                if(params === 'Pw'){
                                    if(data.id === item.companyId){
                                        if(data.phone === item.phone){
                                            let pushData = {
                                                company:all.company,
                                                id:item.companyId,
                                                name:item.name,
                                                change:true,
                                                approval:all.approval
                                            }
                                            findData.push(pushData)
                                        }
                                    }
                                }
                            })
                        })
                        res.status(200).send(findData[0])
                    })
                    .catch(err=>{
                        res.status(400).send(err)
                    })
            }
        },

        logout(req,res){
            try {
                res.clearCookie('companyInfoToken')
                res.status(200).json({message: "logout success"})
            } catch (err) {
                res.status(400).json(err)
            }
        },
        companyLogin(req,res){
            const data = req.body
            Company.find({})
                .then(all=>{
                    let companyData = []
                    let findData = []
                    let findState = false
                    all.map(e=>{
                        e.responsibility.map(item=>{
                            if(data.companyId === item.companyId){
                                companyData.push(e)
                                findData.push(item)
                                findState = true
                            }
                        })
                    })
                    if(findState === false){
                        res.status(400).send('해당 기업 ID로 가입된 정보가 존재하지 않습니다.')
                    }else{
                        if(companyData[0].approval === false){
                            res.status(400).send('사용승인 중입니다. 사용승인이 완료될 경우 담당자 번호로 아이디 비밀번호가 전송됩니다. 확인 후 이용 부탁드립니다.')
                        }else{
                            const user = findData[0]
                            const companyInfo = companyData[0]
                            bcrypt.compare(req.body.companyPw,user.password,function (_err,isMatch){
                                if(!isMatch){
                                    res.status(400).send('비밀번호가 일치하지 않습니다.')
                                }else{
                                    if(user.admin === true){
                                        let time = moment().tz('Asia/Seoul')
                                        let day = time.format('YYYY-MM-DD kk:mm:ss')
                                        let ex = moment(day).add(1,'hours').format('YYYY-MM-DD kk:mm:ss')
                                        if(user.manager === true){
                                            let managerEx = moment(day).add(10,'hours').format('YYYY-MM-DD kk:mm:ss')
                                            const companyToken = jwt.sign({
                                                company:companyInfo.company,
                                                organizations:companyInfo.organizations,
                                                macAddress:companyInfo.macAddress,
                                                responsibility:companyInfo.responsibility,
                                                loginId:data.companyId,
                                                admin:true,
                                                manager:true,
                                                approval: companyInfo.approval,
                                                expireTime:managerEx
                                            },COMPANY_SECRET,{expiresIn:'10h'})

                                            res.cookie('companyInfoToken',companyToken,{
                                                secure:false,
                                                httpOnly:true
                                            })
                                            let sendData = {
                                                company:companyInfo.company,
                                                allData:all,
                                                admin:true,
                                                loginId:data.companyId,
                                                manager:true,
                                                approval: true,
                                                expireTime:managerEx
                                            }
                                            res.status(200).send(sendData)
                                        }else{
                                            const companyToken = jwt.sign({
                                                company:companyInfo.company,
                                                organizations:companyInfo.organizations,
                                                macAddress:companyInfo.macAddress,
                                                responsibility:companyInfo.responsibility,
                                                loginId:data.companyId,
                                                manager:false,
                                                admin:true,
                                                approval: companyInfo.approval,
                                                expireTime:ex
                                            },COMPANY_SECRET,{expiresIn:'1h'})

                                            res.cookie('companyInfoToken',companyToken,{
                                                secure:false,
                                                httpOnly:true
                                            })
                                            let sendData = {
                                                company:companyInfo.company,
                                                organizations:companyInfo.organizations,
                                                macAddress:companyInfo.macAddress,
                                                responsibility:companyInfo.responsibility,
                                                loginId:data.companyId,
                                                manager:false,
                                                admin:true,
                                                approval: companyInfo.approval,
                                                expireTime:ex
                                            }
                                            res.status(200).send(sendData)
                                        }

                                    }else {
                                        let time = moment().tz('Asia/Seoul')
                                        let day = time.format('YYYY-MM-DD kk:mm:ss')
                                        let ex = moment(day).add(1,'hours').format('YYYY-MM-DD kk:mm:ss')

                                        const companyToken = jwt.sign({
                                            company:companyInfo.company,
                                            organizations:companyInfo.organizations,
                                            macAddress:companyInfo.macAddress,
                                            responsibility:companyInfo.responsibility,
                                            loginId:data.companyId,
                                            manager:false,
                                            admin:false,
                                            approval: companyInfo.approval,
                                            expireTime:ex

                                        },COMPANY_SECRET,{expiresIn:'1h'})

                                        res.cookie('companyInfoToken',companyToken,{
                                            secure:false,
                                            httpOnly:true
                                        })

                                        let sendData = {
                                            company:companyInfo.company,
                                            organizations:companyInfo.organizations,
                                            responsibility:companyInfo.responsibility,
                                            macAddress:companyInfo.macAddress,
                                            loginId:data.companyId,
                                            manager:false,
                                            admin:false,
                                            approval: companyInfo.approval,
                                            expireTime:ex
                                        }

                                        res.status(200).send(sendData)
                                    }

                                }
                            })
                        }

                    }
                })
                .catch(err=>{
                    res.status(400).send(err)
                })
        },

        approvalCompany(req,res){
          const data = req.body
            Company.find({})
                .then(allData=>{
                    let checkAddress = false
                    allData.map(e=>{
                        data.macAddress.map(item=>{
                            e.macAddress.map(check=>{
                                if(check === item){
                                    checkAddress = true
                                }
                            })
                        })
                    })
                    if(checkAddress === true){
                        res.status(400).send('이미 사용 중인 기기넘버입니다. MacAddress를 다시 한번 확인해주세요.')
                    }else{
                        Company.find({company:data.company})
                            .then(approv=>{
                                if(approv.approval === true){
                                    res.status(401).send('이미 사용승인이 완료 되었습니다. 작성하신 담당자님의 이메일, 핸드폰(SMS)를 확인하여 주세요.')
                                }else{
                                    let companyIdCheck = false
                                    approv[0].responsibility.map(e=>{
                                        if(e.companyId === data.company.toLowerCase()){
                                            companyIdCheck = true
                                        }
                                    })
                                    if(companyIdCheck === true){
                                        res.status(402).send('이미 사용승인 요청이 되어있습니다. 승인처리 후 작성하신 담당자 이메일과 핸드폰(SMS)로 안내문자가 발송됩니다. 잠시만 기다려 주세요.')
                                    }else{
                                        const pwData = data.company.toLowerCase()+data.phone.split('-').join('')
                                        const bcryptPwData = bcrypt.hashSync(pwData, 10)
                                        let setData = {
                                            macAddress:data.macAddress,
                                            responsibility:[{companyId:data.company.toLowerCase(),email:data.email,password: bcryptPwData,
                                                name:data.name,phone:data.phone,admin:true}]
                                        }
                                        Company.findOneAndUpdate({company:data.company},{$set:setData})
                                            .then(suc=>{
                                                res.status(200).send('사용승인이 요청 되었습니다. 빠른시간 내 승인처리 후 담당자 이메일과 핸드폰(SMS)로 안내문자가 발송됩니다. 잠시만 기다려주세요...')
                                            })
                                            .catch(err=>{
                                                res.status(400).send(err)
                                            })
                                    }

                                }
                            })
                            .catch(err=>{
                                console.log(err)
                            })
                    }
                })
        },
    }
}