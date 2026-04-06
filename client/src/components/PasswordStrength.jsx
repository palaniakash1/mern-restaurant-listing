const PasswordStrength = ({ password }) => {
  const calculateStrength = (pwd) => {
    if (!pwd) return 0;
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return Math.min(strength, 5);
  };

  const strength = calculateStrength(password);
  
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const strengthColors = [
    "",
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-[#8fa31e]",
    "bg-emerald-500"
  ];
  
  const strengthTextColors = [
    "",
    "text-red-500",
    "text-orange-500",
    "text-yellow-500",
    "text-[#8fa31e]",
    "text-emerald-500"
  ];

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? strengthColors[strength] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${strengthTextColors[strength]}`}>
        Password strength: {strengthLabels[strength]}
      </p>
    </div>
  );
};

export default PasswordStrength;