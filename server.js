import express from 'express';

const app = express();

app.use(express.json({ limit: '10kb' }));

app.use(express.static('public'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});
let projects = [];
app.get('/api/projects',(req,res)=>{
    res.json(projects);
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => console.log(`Open http://localhost:${port}`));
