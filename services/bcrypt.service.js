const bcrypt = require('bcrypt');

const bcryptService = () => {
		const password = (user) => {
		const saltRounds = 10; // Recommended default
		const hash = bcrypt.hashSync(user.password, saltRounds);
		
		return hash;
	};

	const comparePassword = (pw, hash) => (
		bcrypt.compareSync(pw, hash)
	);

	return {
		password,
		comparePassword,
	};
};

module.exports = bcryptService;
