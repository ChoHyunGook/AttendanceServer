
export default function Attendance(mongoose){
    const attendanceSchema = new mongoose.Schema({
        company: {type:String, required: true},
        userId: {type:String, unique: true, required: true, min:10},
        attendance: {type:String, required: true, trim: true},
        quit: {type:String, unique: true, required:true},
        overtime: {type:String, required:true},
        earlyQuit: {type:String, required:true},
        tardiness: {type:Boolean, required:true},
        absence: {type:Boolean, required:true},
        date: {type:String, required:true},
        state: {type:Boolean, required:true},
        yearBreak: {type:Number, required:true},
        monthBreak: {type:Number, required:true},
        family: {type:Boolean, required:true},
        maternity: {type:Boolean, required:true},
        paidBreak: {type:Boolean, required:true},
    },{ versionKey : false })

    return mongoose.model('Attendance', attendanceSchema)
}