

export default function Device(mongoose){
    const deviceSchema = new mongoose.Schema({
        userId:{type:String},
        time:{type:String},
        date:{type:String}
    },{versionKey : false})
    return mongoose.model('Device',deviceSchema)
}