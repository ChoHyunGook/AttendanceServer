//absence = 결석
//overTime = 연장근무
//earlyQuit = 조퇴
//tardiness = 지각
//
export default function Attendance(mongoose){
    const attendanceSchema = new mongoose.Schema({
        company: {type: String, required: true},
        userId: {type: String, unique: true, required: true, min: 10},
        attendance: {
            type: {
                workTime: String, //User 출퇴근시간
                start: {time: String, state: Boolean}, //출근시간
                end: {time: String, state: Boolean}, //퇴근시간
                state: {
                    absence: {state: Boolean}, //결석
                    overTime: {time: String, state: Boolean}, //연장근무
                    earlyQuit: {time: String, state: Boolean}, //조퇴
                    tardiness: {time: String, state: Boolean}, // 지각
                    break: {content: String, paid: Boolean, state: Boolean}, //휴무
                    normal: {state: Boolean} //정상
                },
                event: {birth:Boolean,anniversary:Boolean}
            }
        },
        date: {type: String, required: true}
    },{ versionKey : false })

    return mongoose.model('Attendance', attendanceSchema)
}