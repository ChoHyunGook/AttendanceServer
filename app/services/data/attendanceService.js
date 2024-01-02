import applyDotenv from "../../Lambdas/applyDotenv.js";
import dotenv from "dotenv";
import db from "../../DataBase/index.js";
import moment from "moment-timezone";
import send from "../../routes/send/Send.js";


export default function AttendanceService(){
    const { access_jwt_secret, authNum_jwt_secret }=applyDotenv(dotenv)

    const User = db.User
    const Company = db.Company
    const Device = db.Device

    return{
        refineAndGetData(req,res){
            const data = req.body
            const userData = data.userData
            User.findOne({company:data.company,userId:userData.info.userId})
                .then(user=>{
                    let tzData = moment().tz('Asia/Seoul')
                    let now = tzData.format('YYYY-MM-DD')

                    Device.find({userId:userData.info.userId}).sort({'date':-1}).sort({'time':-1})
                        .then(deviceAllData=>{
                            let monthData = []
                            let latestData = []
                            let latestDate = []
                            let count = 0;
                            let log = []

                            deviceAllData.map(e=>{
                                //최신날짜 데이터
                                if(latestData.length === 0){
                                    latestData.push(e)
                                    latestDate.push(e.time)
                                }else{
                                    latestData.map(item=>{
                                        if(item.date.split('-').join('') <= e.date.split('-').join('')){
                                            const findCheck = latestData.find((el)=>el._id === e._id)
                                            if(findCheck === undefined){
                                                latestData.push(e)
                                                latestDate.push(e.time)
                                            }
                                        }
                                    })
                                }
                                //당일 날짜 기준 월별 데이터
                                if(now.split('-')[0]+now.split('-')[1] === e.date.split('-')[0]+e.date.split('-')[1]){
                                    if(monthData.length === 0){
                                        monthData.push(e)
                                    }else{
                                        const findCheck = monthData.find((el)=>el._id === e._id)
                                        if(findCheck === undefined){
                                            monthData.push(e)
                                        }
                                    }
                                }
                                //로그 25개
                                count += 1
                                if(count <= 25){
                                    log.push(e)
                                }
                            })

                            let sendLatestData = {
                                start:latestData.find((el)=>el.time === latestDate.reduce((a,b)=>{
                                    return new Date(a).getTime() <= new Date(b).getTime() ? a:b
                                })),
                                end:latestData.find((el)=>el.time === latestDate.reduce((a,b)=>{
                                    return new Date(a).getTime() <= new Date(b).getTime() ? b:a
                                }))
                            }

                            let userWorkData = {
                                start:user.etc.workTime.split('-')[0]+':00',
                                end:user.etc.workTime.split('-')[1]+':00'
                            }

                            let sendData = {
                                latestData:sendLatestData,
                                monthData:monthData,
                                basicData:userWorkData,
                                state: {
                                    start: userWorkData.start.split(':').join('') < sendLatestData.start.time.split(':').join('') ? 'tardiness':'normal',
                                    end: userWorkData.end.split(':').join('') > sendLatestData.end.time.split(':').join('')
                                        ? sendLatestData.start.time === sendLatestData.end.time ? 'onDuty' : 'abNormal' : 'normal'
                                },
                                break:{
                                    yearBreak:user.break.year,
                                    monthBreak: user.break.month,
                                    familyBreak: user.break.special.family,
                                    maternityBreak: user.break.special.maternity
                                },
                                log:log
                            }


                            res.status(200).send(sendData)
                            // deviceAllData.map(e=>{
                            //     console.log(deviceAllData)
                            //     if(now === e.date){
                            //         todayData.push(e)
                            //         // if(startTime.length === 0){
                            //         //     startTime.push(e)
                            //         // }else{
                            //         //     startTime.map(item=>{
                            //         //         let deviceSplit = e.time.split(':').join('')
                            //         //         console.log(Number(deviceSplit))
                            //         //         console.log(Number(item.time.split(':').join('')))
                            //         //         console.log(deviceSplit > item.time.split(':').join(''))
                            //         //         if(Number(deviceSplit) > Number(item.time.split(':').join(''))){
                            //         //             quitTime[0] = e
                            //         //         }else{
                            //         //             startTime[0] = e
                            //         //         }
                            //         //     })
                            //         // }
                            //     }else{
                            //         if(todayData.length === 0 ){
                            //             todayData.push(e)
                            //         }else{
                            //
                            //         }
                            //     }
                            // })

                            //
                            // if(todayData.length !== 0 ){
                            //     //오늘의 근태정보 있음
                            //     todayData.map(e=>{
                            //         if(startTime.length === 0){
                            //             startTime.push(e)
                            //         }else{
                            //             let diffTime = e.time.split(':').join('')
                            //
                            //             if(startTime[0].time.split(':').join('') > diffTime){
                            //                 const changeTime = startTime[0]
                            //                 quitTime.push(changeTime)
                            //                 startTime[0] = e
                            //             }else{
                            //                 if(quitTime[0].time.split(':').join('') < diffTime){
                            //                     quitTime[0] = e
                            //                 }
                            //             }
                            //         }
                            //     })
                            // }else{
                            //     //없음, 재택, 휴가, 결석 등등
                            // }

                            //console.log(user)

                            // const workStart = user.etc.workTime.split('-')[0]+':00'
                            // const workQuit = user.etc.workTime.split('-')[1]+':00'
                            // let state;
                            //
                            // if(workStart.split(':').join('') < startTime[0].time.split(':').join('')){
                            //     state = 'tardiness'
                            // }else {
                            //     state = 'normal'
                            // }
                            //
                            // let sendData = {
                            //     startTime:startTime[0],
                            //     quitTime:quitTime[0],
                            //     workStart:workStart,
                            //     workQuit:workQuit,
                            //     state:state,
                            //     yearBreak:user.break.year,
                            //     monthBreak: user.break.month,
                            //     familyBreak: user.break.special.family,
                            //     maternityBreak: user.break.special.maternity
                            // }
                            //
                            // res.status(200).send(sendData)

                        })
                        .catch(err=>{
                            res.status(400).send(err)
                        })
                })
                .catch(err=>{
                    res.status(400).send(err)
                })
        },

    }
}