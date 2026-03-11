"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, KeyRound, Trash2, UserPlus } from "lucide-react"

type User = {
  id: number
  username: string
  isAdmin: boolean
  isActive: boolean
  createdAt: string
}

type CurrentUser = {
  id: number
  username: string
  isAdmin: boolean
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [pwDialog, setPwDialog] = useState<{
    open: boolean
    userId: number | null
    username: string
    isOwnAccount: boolean
  }>({ open: false, userId: null, username: "", isOwnAccount: false })
  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNew, setPwNew] = useState("")
  const [pwError, setPwError] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const router = useRouter()

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users")
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users)
    }
  }

  const fetchCurrentUser = async () => {
    const res = await fetch("/api/auth/me")
    if (res.ok) {
      const data = await res.json()
      setCurrentUser(data.user)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchCurrentUser()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, isAdmin }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setUsername("")
      setPassword("")
      setIsAdmin(false)
      fetchUsers()
    } catch {
      setError("Erreur lors de la création.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      fetchUsers()
    } catch {
      // Silently fail
    }
  }

  const openPwDialog = (user: User) => {
    setPwDialog({
      open: true,
      userId: user.id,
      username: user.username,
      isOwnAccount: user.id === currentUser?.id,
    })
    setPwCurrent("")
    setPwNew("")
    setPwError("")
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError("")
    setPwLoading(true)

    try {
      let res: Response

      if (pwDialog.isOwnAccount) {
        res = await fetch("/api/auth/change-password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
        })
      } else {
        res = await fetch(`/api/admin/users/${pwDialog.userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: pwNew }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        setPwError(data.error)
        return
      }

      setPwDialog({ open: false, userId: null, username: "", isOwnAccount: false })
    } catch {
      setPwError("Erreur lors du changement de mot de passe.")
    } finally {
      setPwLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchUsers()
      }
    } catch {
      // Silently fail
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Administration</h1>
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au Loto
          </Button>
        </div>

        {/* Create user form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Créer un utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">Nom d&apos;utilisateur</Label>
                  <Input
                    id="new-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="min. 3 caractères"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="min. 8 caractères"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-admin"
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(checked === true)}
                />
                <Label htmlFor="is-admin">Administrateur</Label>
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Création..." : "Créer l'utilisateur"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users list */}
        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom d&apos;utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.isAdmin ? "default" : "secondary"}>
                        {user.isAdmin ? "Admin" : "Utilisateur"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={() => handleToggleActive(user)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {currentUser && (currentUser.isAdmin || user.id === currentUser.id) && (
                        <Button variant="outline" size="sm" onClick={() => openPwDialog(user)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      )}
                      {currentUser && currentUser.isAdmin && user.id !== currentUser.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer l&apos;utilisateur ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer le compte de{" "}
                                <strong>{user.username}</strong> ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Password change dialog */}
      <Dialog
        open={pwDialog.open}
        onOpenChange={(open) => setPwDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Changer le mot de passe — {pwDialog.username}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {pwDialog.isOwnAccount && (
              <div className="space-y-2">
                <Label htmlFor="pw-current">Mot de passe actuel</Label>
                <Input
                  id="pw-current"
                  type="password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="pw-new">Nouveau mot de passe</Label>
              <Input
                id="pw-new"
                type="password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                placeholder="min. 8 caractères"
                required
              />
            </div>
            {pwError && <p className="text-sm text-red-500">{pwError}</p>}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPwDialog((prev) => ({ ...prev, open: false }))}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={pwLoading}>
                {pwLoading ? "Modification..." : "Modifier"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
