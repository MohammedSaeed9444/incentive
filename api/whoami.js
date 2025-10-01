module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ 
    ok: true, 
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};
