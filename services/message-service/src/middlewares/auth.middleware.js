import jwt from 'jsonwebtoken';

export default function authVerify(req, res, next) {
    const auth = req.headers.authorization || req.query.token;
    if (!auth) return res.status(401).json({
        error: 'Unauthorized'
    });
    const token = auth.split(' ')[1];
    try {
        // Use public key (RS256 assumed)
        const pub = process.env.JWT_PUBLIC_KEY;
        const payload = jwt.verify(token, pub, { algorithms: ['RS256'] });
        req.user = payload;
        next();
    } catch (err) {
        console.error('JWT verification Auth middleware failed:', err);
        return res.status(401).json({ error: 'invalid token', details: err.message });
    }
}
