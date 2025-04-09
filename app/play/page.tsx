import { redirect } from "next/navigation"

export default function PlayPage() {
  // Redirect to games page if no specific game is selected
  redirect("/games")
}
