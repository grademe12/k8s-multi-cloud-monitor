"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // 비밀번호 검증
  const validatePassword = () => {
    if (!isLogin) {
      if (password.length < 10) {
        setError("비밀번호는 최소 10자 이상이어야 합니다")
        return false
      }
      if (password !== passwordConfirm) {
        setError("비밀번호가 일치하지 않습니다")
        return false
      }
    }
    setError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 회원가입 시 비밀번호 검증
    if (!isLogin && !validatePassword()) {
      return
    }

    setIsLoading(true)
    setError("")
    
    const endpoint = isLogin ? '/auth/login' : '/auth/register'
    const body = isLogin 
      ? { email, password }
      : { email, password, name }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        router.push('/')
      } else {
        const errorData = await response.json()
        setError(errorData.message || '로그인/회원가입에 실패했습니다')
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? '로그인' : '회원가입'}</CardTitle>
          <CardDescription>
            {isLogin 
              ? 'K8s Multi-Cloud Dashboard에 로그인하세요' 
              : '새 계정을 만들어 시작하세요'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 (회원가입 시에만) */}
            {!isLogin && (
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>
            )}
            
            {/* 이메일 */}
            <div>
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>
            
            {/* 비밀번호 */}
            <div>
              <Label htmlFor="password">
                비밀번호 *
                {!isLogin && <span className="text-xs text-muted-foreground ml-2">(최소 10자)</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "비밀번호" : "최소 10자 이상"}
                minLength={isLogin ? undefined : 10}
                required
              />
            </div>

            {/* 비밀번호 확인 (회원가입 시에만) */}
            {!isLogin && (
              <div>
                <Label htmlFor="passwordConfirm">비밀번호 확인 *</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  minLength={10}
                  required
                />
              </div>
            )}

            {/* 에러 메시지 - 간단한 버전 */}
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* 제출 버튼 */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
            </Button>
          </form>
          
          {/* 모드 전환 */}
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsLogin(!isLogin)
                setError("")
                setPassword("")
                setPasswordConfirm("")
              }}
            >
              {isLogin ? '계정이 없으신가요? 회원가입하기' : '이미 계정이 있으신가요? 로그인하기'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}