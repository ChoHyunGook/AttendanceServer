export default function Holiday(mongoose){
    const HolidaySchema = new mongoose.Schema({
        year:{type:String,unique:true},
        data:{
            type:[{
                name:String,
                isHoliday:Boolean,
                date:String
            }]
        },

    },{versionKey : false})
    return mongoose.model('Holiday',HolidaySchema)
}