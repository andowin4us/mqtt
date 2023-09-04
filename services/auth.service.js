const jwt = require('jsonwebtoken');

const secret = process.env.NODE_ENV === 'production' ? process.env.APP_SECRET : 'Se!cure$me';
const expiresIn = process.env.JWT_EXPIRES_IN || '10h';

const authService = () => {
	const issue = (payload) => jwt.sign(payload, secret, { expiresIn });
	const issueLogout = (payload) => jwt.sign(payload, secret, { expiresIn: 1 });
	const verify = (token, cb) => jwt.verify(token, secret, {}, cb);

	return {
		issue,
		verify,
		issueLogout
	};
};

module.exports = authService;
