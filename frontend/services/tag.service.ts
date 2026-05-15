// const API_URL = "http://localhost:3000/api/tags";

// const getHeaders = () => ({
//   "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
//   "Content-Type": "application/json",
// });

// export const tagService = {
//   async getAll() {
//     const res = await fetch(API_URL);
//     return res.json();
//   },

//   async create(name: string) {
//     const res = await fetch(API_URL, {
//       method: "POST",
//       headers: getHeaders(),
//       body: JSON.stringify({ name }),
//     });
//     if (!res.ok) throw new Error("Erreur lors de la création");
//     return res.json();
//   },

//   async delete(id: number) {
//     const res = await fetch(`${API_URL}/${id}`, {
//       method: "DELETE",
//       headers: getHeaders(),
//     });
//     if (!res.ok) throw new Error("Erreur lors de la suppression");
//     return res.json();
//   }
// };