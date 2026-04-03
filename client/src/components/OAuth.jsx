import React, { useEffect } from "react";
import { Button } from "flowbite-react";
import { GoogleAuthProvider, signInWithPopup, getAuth, signOut as firebaseSignOut } from "firebase/auth";
import { app } from "../firebase";
import { useNavigate } from "react-router-dom";
import { AiFillGoogleCircle } from "react-icons/ai";
import { useAuth } from "../context/AuthContext";

export default function OAuth() {
  const auth = getAuth(app);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    firebaseSignOut(auth).catch(() => {});
  }, [auth]);

  const handleGoogleClick = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });
    try {
      const credential = await signInWithPopup(auth, provider);
      const firebaseUser = credential.user;
      const result = await loginWithGoogle({
        name: firebaseUser.displayName,
        email: firebaseUser.email,
        googlePhotoUrl: firebaseUser.photoURL,
      });

      await firebaseSignOut(auth).catch(() => {});

      if (result.success) {
        navigate("/");
      }
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.log(error);
      }
    }
  };

  return (
    <Button
      type="button"
      outline
      className=" uppercase !bg-[#8fa31e] hover:!bg-[#7a8c1a] text-white !rounded-lg border-none focus:!ring-[#8fa31e] focus:!border-[#8fa31e]"
      onClick={handleGoogleClick}
    >
      <AiFillGoogleCircle className="w-6 h-6 mr-2" />
      Signin with Google
    </Button>
  );
}
