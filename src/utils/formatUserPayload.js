function formatUserPayload(user) {
  return {
    user_id: user.user_id,
    avatar: user.avatar || null,
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role
  };
}

module.exports = formatUserPayload;
