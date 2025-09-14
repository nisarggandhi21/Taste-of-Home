import axios from "axios";
import { toast } from "react-toastify";

const upload = async (file) => {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", "taste-of-home");

  try {
    const res = await axios.post(
      "https://api.cloudinary.com/v1_1/dcumlh41c/image/upload",
      data
    );

    const { url } = res.data;
    return url;
  } catch (err) {
    toast.error("Image upload failed!");
    throw err;
  }
};

export default upload;
