import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRoleService } from '../../services/user-role.service';
import { CreateRaffleComponent } from '../create-raffle/create-raffle.component';
import { JoinRaffleComponent } from '../join-raffle/join-raffle.component';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [CommonModule, CreateRaffleComponent, JoinRaffleComponent],
  templateUrl: './main-dashboard.component.html',
  styleUrls: ['./main-dashboard.component.scss']
})
export class MainDashboardComponent implements OnInit {
  activeTab: 'create' | 'join' = 'join';
  user: User | null = null;
  loading = false;

  constructor(public userRoleService: UserRoleService) {}

  ngOnInit() {
    this.userRoleService.user$.subscribe(user => {
      this.user = user;
      // Default to create tab if user can create raffles, otherwise join tab
      if (user && this.userRoleService.canCreateRaffles()) {
        this.activeTab = 'create';
      } else {
        this.activeTab = 'join';
      }
    });

    this.userRoleService.loading$.subscribe(loading => {
      this.loading = loading;
    });
  }

  switchTab(tab: 'create' | 'join') {
    this.activeTab = tab;
  }

  get canCreateRaffles(): boolean {
    return this.userRoleService.canCreateRaffles();
  }

  get canJoinRaffles(): boolean {
    return this.userRoleService.canJoinRaffles();
  }
}