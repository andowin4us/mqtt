/* eslint-disable no-console */
const md5 = require('md5');

const md5Service = () => {
	const password = (user) => {
		const hash = md5(user.password);
		return hash;
	};

	const comparePassword = (pw, hash) => (

		md5(pw) === hash
	);

	return {
		password,
		comparePassword,
	};
};

module.exports = md5Service;
