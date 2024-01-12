//absence = 결석
//overTime = 연장근무
//earlyQuit = 조퇴
//tardiness = 지각
//
export default function Vacation(mongoose){
    const attendanceSchema = new mongoose.Schema({
        company: {type: String, required: true},
        userId: {type: String, required: true, min: 10},
        type: {type:String, required: true},
        date: {type: String, required: true}
    },{ versionKey : false })

    return mongoose.model('Vacation', attendanceSchema)
}