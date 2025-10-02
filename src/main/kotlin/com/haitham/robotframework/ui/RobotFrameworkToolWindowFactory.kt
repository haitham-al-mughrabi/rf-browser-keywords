package com.haitham.robotframework.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

class RobotFrameworkToolWindowFactory : ToolWindowFactory {
    
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val robotFrameworkToolWindow = RobotFrameworkToolWindow(project)
        val content = ContentFactory.getInstance().createContent(
            robotFrameworkToolWindow.getContent(), 
            "", 
            false
        )
        toolWindow.contentManager.addContent(content)
    }
}
