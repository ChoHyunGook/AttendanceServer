import applyDotenv from "../../Lambdas/applyDotenv.js";
import dotenv from "dotenv";
import db from "../../DataBase/index.js";
import moment from "moment-timezone";
import send from "../../routes/send/Send.js";
import axios from "axios";
import {query} from "express";
import SendService from "../send/sendService.js";




export default function AttendanceService(){
    const { access_jwt_secret, authNum_jwt_secret }=applyDotenv(dotenv)

    const User = db.User
    const Company = db.Company
    const Device = db.Device
    const Holiday = db.Holiday
    const Vacation = db.Vacation

    return{

        async getHoliday(req, res) {
            const start = req.query.start
            const end = req.query.end
            const getAllData = req.query.getDays

            if(getAllData === 'all'){

            }else{
                //데이터 수집용
                const year = []
                for (let i = Number(start); i <= Number(end); i++) {
                    year.push(i)
                }
                year.map(items=>{
                    axios.get('http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo',
                        {
                            params:{
                                solYear:`${items}`,
                                numOfRows:'100',
                                ServiceKey: "/yw6MWBdKiiHTvwqFHKG08Ey8tvkUVmqReoU7hkIj5CKWoL5fofNaLsjfc/skdy9csTg3SOvEyZVc65BsIG5eQ=="
                            }})
                        .then(dd=>{
                            const data = dd.data.response.body.items.item
                            let saveData = []
                            data.map(e=>{
                                let pushData = {
                                    name:e.dateName,
                                    isHoliday:e.isHoliday === 'Y' ? true:false,
                                    date:`${e.locdate}`.substring(0,4)+'-'+`${e.locdate}`.substring(4,6)+'-'+`${e.locdate}`.substring(6,8)
                                }
                                saveData.push(pushData)
                            })
                            let dbData = {
                                year:`${items}`,
                                data:saveData
                            }
                            new Holiday(dbData).save((err) => {
                                if (err) {
                                    console.log(`${items} 년 Save Fail`)
                                } else {
                                    console.log(`${items} 년 Save Complete`)
                                }
                            })
                        })
                })
                res.status(200).send(`Request Success`)
            }

        },


        refineAndGetData(req,res){
            const data = req.body
            const userData = data.userData
            User.findOne({company:data.company,userId:userData.info.userId})
                .then(user=>{
                    let tzData = moment().tz('Asia/Seoul')
                    let now = tzData.format('YYYY-MM-DD')
                    let days = tzData.days()
                    const weekStartData = tzData.subtract(days, 'days');

                    Device.find({userId:userData.info.userId}).sort({'date':-1}).sort({'time':-1})
                        .then(deviceAllData=>{
                            Holiday.find({}).sort({"year":-1})
                                .then(findAllData=>{
                                    Vacation.find({company:data.company,userId:userData.info.userId}).sort({'date':-1})
                                        .then(vacationAllData=>{
                                            let monthData = []
                                            let weekData = []
                                            let latestData = []
                                            let latestDate = []
                                            let count = 0;
                                            let monthCount =0;
                                            let weekCount =0;
                                            let log = []
                                            const day = new Date();
                                            const sunday = day.getTime() - 86400000 * day.getDay();

                                            day.setTime(sunday);

                                            const column = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일']
                                            const weeks = [{column:column[0],date:day.toISOString().slice(0, 10)}];

                                            for (let i = 1; i < 7; i++) {
                                                day.setTime(day.getTime() + 86400000);
                                                weeks.push({column:column[i],date:day.toISOString().slice(0, 10)});
                                            }



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
                                                // 월별 데이터
                                                if(monthData.length === 0){
                                                    let pushData = {
                                                        _id:e._id,
                                                        userId:e.userId,
                                                        date:e.date,
                                                        time:e.time,
                                                        state:'end'
                                                    }
                                                    monthData.push(pushData)
                                                    monthCount = 1
                                                }else{
                                                    if(e.date === monthData.slice(-1)[0].date){
                                                        if(monthCount === 1){
                                                            let pushData = {
                                                                _id:e._id,
                                                                userId:e.userId,
                                                                date:e.date,
                                                                time:e.time,
                                                                state:'start'
                                                            }
                                                            monthData.push(pushData)
                                                            monthCount = 2
                                                        }else{
                                                            if(monthCount === 2){
                                                                let pushData = {
                                                                    _id:e._id,
                                                                    userId:e.userId,
                                                                    date:e.date,
                                                                    time:e.time,
                                                                    state:'start'
                                                                }
                                                                monthData[monthData.length -1] = pushData
                                                            }
                                                        }

                                                    }else{
                                                        if(monthData.length === 1){
                                                            monthData[0].state = 'start'
                                                        }
                                                        let pushData = {
                                                            _id:e._id,
                                                            userId:e.userId,
                                                            date:e.date,
                                                            time:e.time,
                                                            state:'end'
                                                        }
                                                        monthData.push(pushData)
                                                        monthCount = 1
                                                    }
                                                }

                                                //주간데이터

                                                const findWeeksCheck = weeks.find((el)=>el.date === e.date)

                                                if(findWeeksCheck !== undefined){
                                                    if(weekData.length === 0){
                                                        let pushData = {
                                                            _id:e._id,
                                                            userId:e.userId,
                                                            date:e.date,
                                                            time:e.time,
                                                            state:'end'
                                                        }
                                                        weekData.push(pushData)
                                                        weekCount = 1
                                                    }else{
                                                        if(e.date === weekData.slice(-1)[0].date){
                                                            if(weekCount === 1){
                                                                let pushData = {
                                                                    _id:e._id,
                                                                    userId:e.userId,
                                                                    date:e.date,
                                                                    time:e.time,
                                                                    state:'start'
                                                                }
                                                                weekData.push(pushData)
                                                                weekCount = 2
                                                            }else{
                                                                if(weekCount === 2){
                                                                    let pushData = {
                                                                        _id:e._id,
                                                                        userId:e.userId,
                                                                        date:e.date,
                                                                        time:e.time,
                                                                        state:'start'
                                                                    }
                                                                    weekData[weekData.length -1] = pushData
                                                                }
                                                            }

                                                        }else{
                                                            if(weekData.length === 1){
                                                                weekData[0].state = 'start'
                                                            }
                                                            let pushData = {
                                                                _id:e._id,
                                                                userId:e.userId,
                                                                date:e.date,
                                                                time:e.time,
                                                                state:'end'
                                                            }
                                                            weekData.push(pushData)
                                                            weekCount = 1
                                                        }
                                                    }
                                                }

                                                //로그 25개
                                                count += 1
                                                if(count <= 25){
                                                    log.push(e)
                                                }
                                            })

                                            weeks.map(e=>{
                                                weekData.map(el=>{
                                                    if(e.date === el.date){
                                                        let index = weeks.findIndex(obj=>obj.date == el.date)
                                                        if(el.state === 'start'){
                                                            weeks[index].start = el.time
                                                        }else{
                                                            weeks[index].end = el.time
                                                        }
                                                    }
                                                })
                                            })

                                            //공휴일 정제 & 휴가 정제

                                            let sendHolidayData = []

                                            findAllData.map(e=>{
                                                e.data.map(el=>{
                                                    if(el.name === '기독탄신일'){
                                                        let pushData = {
                                                            date:el.date,
                                                            isHoliday:el.isHoliday,
                                                            title:"크리스마스"
                                                        }
                                                        sendHolidayData.push(pushData)
                                                    }else{
                                                        if(el.name === '1월1일'){
                                                            let pushData = {
                                                                date:el.date,
                                                                isHoliday:el.isHoliday,
                                                                title:"신정"
                                                            }
                                                            sendHolidayData.push(pushData)
                                                        }else{
                                                            let pushData = {
                                                                date:el.date,
                                                                isHoliday:el.isHoliday,
                                                                title:el.name
                                                            }
                                                            sendHolidayData.push(pushData)
                                                        }
                                                    }

                                                })
                                            })

                                            vacationAllData.map(e=>{
                                                if(e.type === 'year'){
                                                    let pushData = {
                                                        date:e.date,
                                                        isHoliday:true,
                                                        title:'연차'
                                                    }
                                                    sendHolidayData.push(pushData)
                                                }
                                                if(e.type === 'month'){
                                                    let pushData = {
                                                        date:e.date,
                                                        isHoliday:true,
                                                        title:'월차'
                                                    }
                                                    sendHolidayData.push(pushData)
                                                }
                                                if(e.type === 'family'){
                                                    let pushData = {
                                                        date:e.date,
                                                        isHoliday:true,
                                                        title:'경조사'
                                                    }
                                                    sendHolidayData.push(pushData)
                                                }
                                                if(e.type === 'maternity'){
                                                    let pushData = {
                                                        date:e.date,
                                                        isHoliday:true,
                                                        title:'육아휴직'
                                                    }
                                                    sendHolidayData.push(pushData)
                                                }
                                                if(e.type === 'homeWork'){
                                                    let pushData = {
                                                        date:e.date,
                                                        isHoliday:false,
                                                        title:'재택근무'
                                                    }
                                                    sendHolidayData.push(pushData)
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

                                            if(sendLatestData.start === undefined){
                                                let sendData = {
                                                    latestData:sendLatestData,
                                                    monthData:monthData,
                                                    basicData:userWorkData,
                                                    holidays:sendHolidayData,
                                                    state: {
                                                        start: null,
                                                        end: null
                                                    },
                                                    break:{
                                                        yearBreak:user.break.year,
                                                        monthBreak: user.break.month,
                                                        familyBreak: user.break.special.family,
                                                        maternityBreak: user.break.special.maternity,
                                                    },
                                                    log:log
                                                }

                                                res.status(200).send(sendData)
                                            }else{
                                                let sendData = {
                                                    latestData:sendLatestData,
                                                    monthData:monthData,
                                                    basicData:userWorkData,
                                                    holidays:sendHolidayData,
                                                    state: {
                                                        start: 'normal',
                                                        end: 'normal'
                                                    },
                                                    break:{
                                                        yearBreak:user.break.year,
                                                        monthBreak: user.break.month,
                                                        familyBreak: user.break.special.family,
                                                        maternityBreak: user.break.special.maternity,
                                                    },
                                                    log:log
                                                }

                                                res.status(200).send(sendData)
                                            }

                                        })

                                })

                        })
                        .catch(err=>{
                            res.status(400).send(err)
                        })
                })
                .catch(err=>{
                    res.status(400).send(err)
                })
        },


        vacationService(req,res){
            const data = req.body
            const params = req.query.service

            if(params === 'change'){
                Vacation.find({company:data.company,userId:data.info.userId}).sort({'date':-1})
                    .then(user=>{
                        let now = new Date()
                        let sendVacation = []
                        user.map(e=>{
                            if(now <= new Date(e.date)){
                                sendVacation.push(e)
                            }
                        })
                        if(req.query.checked === 'search'){
                            res.status(200).send(sendVacation)
                        }

                        if(req.query.checked === 'delete'){
                            let delPoint = data.delData
                            let dateMap = delPoint.map(e=>e.date);

                            User.findOne({userId:data.info.userId})
                                .then(user=>{
                                    let changeData = {
                                            special:{
                                                family:user.break.special.family + data.breakCount.family,
                                                maternity:user.break.special.maternity + data.breakCount.maternity
                                            },
                                            year:user.break.year + data.breakCount.year,
                                            month:user.break.month + data.breakCount.month,
                                    }
                                    User.findOneAndUpdate({userId:data.info.userId},{$set:{break:changeData}},{upsert:true})
                                        .then(suc=>{
                                            Vacation.deleteMany({userId:data.info.userId,date:dateMap})
                                                .then(suc2=>{
                                                    Vacation.find({company:data.company,userId:data.info.userId}).sort({'date':-1})
                                                        .then(finalData=>{
                                                            User.findOne({userId:data.info.userId})
                                                                .then(userData=>{
                                                                    let userPushData = {
                                                                        company: userData.company,
                                                                        affiliation:userData.affiliation,
                                                                        info:{
                                                                            name:userData.name,
                                                                            userId: userData.userId,
                                                                            phone: userData.phone},
                                                                        break:userData.break,
                                                                        form:userData.form,
                                                                        etc:userData.etc,
                                                                        expiresDate:data.loginData.expiresDate
                                                                    }
                                                                    let types = []
                                                                    const typePoint = delPoint.map(e=>e.type)

                                                                    typePoint.map(e=>{
                                                                        if(e === 'month'){
                                                                            types.push('월차')
                                                                        }
                                                                        if(e === 'year'){
                                                                            types.push('연차')
                                                                        }
                                                                        if(e === 'family'){
                                                                            types.push('경조사')
                                                                        }
                                                                        if(e === 'maternity'){
                                                                            types.push('육아휴직')
                                                                        }
                                                                    })
                                                                    SendService().VacationSMS('휴가취소',userData.company,userData.name,dateMap,[...new Set(types)],'취소')
                                                                    res.status(200).json({vacation:finalData,userData:userPushData})
                                                                })

                                                        })
                                                })
                                        })


                                })

                        }

                    })



            }


            if(params === 'getData'){
                Vacation.find({company:data.company})
                    .then(findData=>{
                        Holiday.find({}).sort({"year":-1})
                            .then(holidayData=>{
                                User.find({company:data.company})
                                    .then(userData=>{
                                        let sendHolidayData = []

                                        holidayData.map(e=>{
                                            e.data.map(el=>{
                                                if(el.name === '기독탄신일'){
                                                    let pushData = {
                                                        date:el.date,
                                                        isHoliday:el.isHoliday,
                                                        title:"크리스마스"
                                                    }
                                                    sendHolidayData.push(pushData)
                                                }else{
                                                    if(el.name === '1월1일'){
                                                        let pushData = {
                                                            date:el.date,
                                                            isHoliday:el.isHoliday,
                                                            title:"신정"
                                                        }
                                                        sendHolidayData.push(pushData)
                                                    }else{
                                                        let pushData = {
                                                            date:el.date,
                                                            isHoliday:el.isHoliday,
                                                            title:el.name
                                                        }
                                                        sendHolidayData.push(pushData)
                                                    }
                                                }

                                            })
                                        })

                                        findData.map(e=>{
                                            let findData = userData.find(el=> el.userId === e.userId)
                                            if(e.type === 'year'){
                                                let pushData = {
                                                    date:e.date,
                                                    isHoliday:true,
                                                    title:`연차: ${findData.affiliation.department} / ${findData.name}`
                                                }
                                                sendHolidayData.push(pushData)
                                            }
                                            if(e.type === 'month'){
                                                let pushData = {
                                                    date:e.date,
                                                    isHoliday:true,
                                                    title:`월차: ${findData.affiliation.department} / ${findData.name}`
                                                }
                                                sendHolidayData.push(pushData)
                                            }
                                            if(e.type === 'family'){
                                                let pushData = {
                                                    date:e.date,
                                                    isHoliday:true,
                                                    title:`경조사: ${findData.affiliation.department} / ${findData.name}`
                                                }
                                                sendHolidayData.push(pushData)
                                            }
                                            if(e.type === 'maternity'){
                                                let pushData = {
                                                    date:e.date,
                                                    isHoliday:true,
                                                    title:`육아휴직: ${findData.affiliation.department} / ${findData.name}`
                                                }
                                                sendHolidayData.push(pushData)
                                            }
                                            if(e.type === 'homeWork'){
                                                let pushData = {
                                                    date:e.date,
                                                    isHoliday:false,
                                                    title:`재택근무: ${findData.affiliation.department} / ${findData.name}`,
                                                    info:'재택근무'
                                                }
                                                sendHolidayData.push(pushData)
                                            }

                                        })
                                        res.status(200).send(sendHolidayData)
                                    })

                            })
                    })
            }

            if(params === 'signUp'){
                let error = false
                let duplicate = []
                Vacation.find({company: data.company, userId: data.loginData.info.userId})
                    .then(allData=>{
                            data.breakDate.map(e=>{
                                allData.map(item=>{
                                    if(item.date === e){
                                        duplicate.push(item)
                                    }
                                })
                            })
                        if(duplicate.length === 0 ){
                            data.breakDate.map(e=>{
                                let pushData = {
                                    company:data.company,
                                    userId:data.loginData.info.userId,
                                    type:data.type,
                                    date:e
                                }

                                new Vacation(pushData).save((err)=>{
                                    if(err){
                                        console.log(err)
                                        error = true
                                    }else{
                                        console.log(`${data.company} ${data.loginData.info.userId} Vacation Type : ${data.type} date : ${e} update Success`)
                                    }
                                })
                            })
                            User.findOne({company:data.company,userId:data.loginData.info.userId})
                                .then(user=>{
                                    let changeData;
                                    if(data.type === 'year'){
                                        changeData = {
                                            company: user.company,
                                            affiliation:user.affiliation,
                                            name:user.name,
                                            userId: user.userId,
                                            phone: user.phone,
                                            break:{
                                                year:data.breakCount,
                                                month:user.break.month,
                                                special:user.break.special
                                            },
                                            form:user.form,
                                            etc:user.etc,
                                        }
                                    }
                                    if(data.type === 'month'){
                                        changeData = {
                                            company: user.company,
                                            affiliation:user.affiliation,
                                            name:user.name,
                                            userId: user.userId,
                                            phone: user.phone,
                                            break:{
                                                year:user.break.year,
                                                month:data.breakCount,
                                                special:user.break.special
                                            },
                                            form:user.form,
                                            etc:user.etc,
                                        }
                                    }
                                    if(data.type === 'family'){
                                        changeData = {
                                            company: user.company,
                                            affiliation:user.affiliation,
                                            name:user.name,
                                            userId: user.userId,
                                            phone: user.phone,
                                            break:{
                                                year:user.break.year,
                                                month:user.break.month,
                                                special: {
                                                    family:data.breakCount,
                                                    maternity:user.break.special.maternity
                                                }
                                            },
                                            form:user.form,
                                            etc:user.etc,
                                        }
                                    }
                                    if(data.type === 'maternity'){
                                        changeData = {
                                            company: user.company,
                                            affiliation:user.affiliation,
                                            name:user.name,
                                            userId: user.userId,
                                            phone: user.phone,
                                            break:{
                                                year:user.break.year,
                                                month:user.break.month,
                                                special: {
                                                    family:user.break.special.family,
                                                    maternity:data.breakCount
                                                }
                                            },
                                            form:user.form,
                                            etc:user.etc,
                                        }
                                    }



                                    User.findOneAndUpdate({company:data.company,userId:data.loginData.info.userId},{$set:changeData})
                                        .then(users=>{
                                            User.findOne({company:data.company,userId:data.loginData.info.userId})
                                                .then(userData=>{
                                                    let sendData = {
                                                        company: userData.company,
                                                        affiliation:userData.affiliation,
                                                        info:{name:userData.name,userId: userData.userId,
                                                            phone: userData.phone},
                                                        break:userData.break,
                                                        form:userData.form,
                                                        etc:userData.etc,
                                                        expiresDate:data.loginData.expiresDate
                                                    }
                                                    let typePoint ='';
                                                    if(data.type === 'month'){
                                                        typePoint = '월차'
                                                    }
                                                    if(data.type === 'year'){
                                                        typePoint = '연차'
                                                    }
                                                    if(data.type === 'family'){
                                                        typePoint = '경조사'
                                                    }
                                                    if(data.type === 'maternity'){
                                                        typePoint = '육아휴직'
                                                    }
                                                    SendService().VacationSMS('휴가신청',userData.company,userData.name,data.breakDate,typePoint,'신청')

                                                    res.status(200).json({msg:'휴가신청 완료', userData:sendData})
                                                })
                                        })
                                        .catch(err=>{
                                            res.status(400).send(err)
                                        })

                                })

                        }else{
                            res.status(402).send(`날짜 : ${duplicate.map(e=>e.date)}가 이미 휴가로 지정되어 있습니다. 다시 한번 확인해주세요.`)
                        }
                    })
                    .catch(err=>{
                        res.status(400).send(err)
                    })
            }

        },



    }
}