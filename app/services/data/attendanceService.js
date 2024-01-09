import applyDotenv from "../../Lambdas/applyDotenv.js";
import dotenv from "dotenv";
import db from "../../DataBase/index.js";
import moment from "moment-timezone";
import send from "../../routes/send/Send.js";
import axios from "axios";




export default function AttendanceService(){
    const { access_jwt_secret, authNum_jwt_secret }=applyDotenv(dotenv)

    const User = db.User
    const Company = db.Company
    const Device = db.Device
    const Holiday = db.Holiday

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

                                    //공휴일 정제

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
                                        holidays:sendHolidayData,
                                        state: {
                                            start: userWorkData.start.split(':').join('') < sendLatestData.start.time.split(':').join('') ? 'tardiness':'normal',
                                            end: userWorkData.end.split(':').join('') > sendLatestData.end.time.split(':').join('')
                                                ? sendLatestData.start.time === sendLatestData.end.time ? 'onDuty' : 'abNormal' : 'normal'
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


    }
}