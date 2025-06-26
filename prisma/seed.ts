import { PrismaClient, Role } from "@prisma/client"
import * as bcrypt from "bcrypt"
const db = new PrismaClient()

async function main() {
    try {
        // Create Base User For Local User 
        const pwd = await bcrypt.hash('12341234', 10);
        const user = await db.user.create({
            data: {
                role: Role.USER,
                name: "LocalUser",
                email: "localTest@test.com",
                password: pwd

            }
        })

    }catch(error) {
        console.error(error)
    }
}

main()