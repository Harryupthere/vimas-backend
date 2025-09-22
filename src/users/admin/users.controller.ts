import { Body, Controller, Get, Param, Patch ,Query} from '@nestjs/common';
import { UsersService } from '../users.service';
import { UpdateUserDto } from '../dto/update-user.dto';
@Controller('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

@Get('users') // GET users
findAll(
  @Query('page') pageStr: string = '1',    // default page 1
  @Query('limit') limitStr: string = '10', // default 10 items per page
) {
  const page = parseInt(pageStr);
  const limit = parseInt(limitStr);

  return this.usersService.findAll(page, limit);
}


  @Get('user/:id') // GET user/:id
  findOne(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Patch('user/:id') // PATCH user/:id
  update(@Param('id') id: string, @Body() userUpdate: UpdateUserDto) {
    return this.usersService.update(+id, userUpdate);
  }
}
