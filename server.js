const express = require('express')
const app = express()
var bodyParser = require('body-parser')
var cors = require('cors')
var knex= require('knex')
var bcrypt=require('bcryptjs')
var jwt=require('jsonwebtoken')
const db=knex({
  client: 'pg',
  connection:{connectionString: process.env.DATABASE_URL,
  ssl: true,}
});
const SECRET='WHY SHOULD I TELL YOU'
var user;

const auth=(req,res,next)=>{
  if(req.headers && req.headers.auth && req.headers.auth.split(' ')[0]==='JWT'){
    jwt.verify(req.headers.auth.split(' ')[1],SECRET,(error,decoded)=>{
      if(error) return res.status(401).send()
      user=decoded
      console.log('authenticated as',decoded.email)
      next()

    })
  } else return res.status(401).send()
}

app.use(cors());
app.use(bodyParser.json());

app.post('/signin', (req, res) => {
  db('users').where('email',req.body.email).select('email','password','id')
  .then((rows)=>{
    if (rows[0]!=undefined) {
    bcrypt.compare(req.body.password, rows[0].password, (error, matched) => {
      if (!error && matched) {
        res.status(201).json({token: jwt.sign({ email: rows[0].email,id:rows[0].id}, SECRET)})
      } else res.status(401).json({message:"Wrong Crendentials"})
    })
  } else res.status(401).json({message:'Email Id not registered'})
  })
})

app.post('/register', (req, res) => {

  bcrypt.hash(req.body.password, 10, (error, hash) => {
    if (error) return res.status(500).send()
    db('users')
    .insert({
      email:req.body.email,
      password:hash,
      name:req.body.name
    })
    .then(res.status(201).send('registered'))
  })
})

app.post('/add-question',auth,(req,res) => {
  db('question')
    .returning('*')
    .insert({
      title:req.body.question,
      user_id:user.id,
      is_anonymous: 0
    })
    .then(user =>{
      res.json(user);
    })
})
app.post('/add-answer',(req,res) => {
  db('answers')
    .returning('*')
    .insert({
      answer_text:req.body.answer,
      user_id:req.body.user_id,
      question_id:req.body.question_id,
      is_anonymous: 0
    })
      .then(data=>res.json(data))
})

app.get('/question',(req,res) =>{
  db('question')
    db.select( 'id', 'user_id','title').from('question')
    .then(questions => {
      res.json(questions);
    })
})

app.get('/answer',(req,res) =>{
  db('answers')
    db.select( 'id', 'user_id','answer_text','question_id').from('answers')
    .then(answers => {
      res.json(answers);
    })
})
app.get('/feed-question',(req,res) =>{
  db('question')
    db('question').where({
        id: req.query.question_id,
      }).select('title','user_id')
    .then(questions => {
      res.json(questions);
    })
})
app.listen(process.env.PORT||8080, () => console.log('Example app listening on port 8080!'))
